import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Building2,
  Crown,
  Zap,
  CornerDownRight,
  History,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { 
  WorkflowStepHistory, 
  WorkflowStepAction, 
  ApprovalTierLevel,
  RejectionHistoryEntry,
} from '@/types/approvalWorkflows';

const tierLevelColors: Record<ApprovalTierLevel, string> = {
  1: '#10B981',
  2: '#3B82F6',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#7C3AED',
};

const tierLevelIcons: Record<ApprovalTierLevel, React.ReactNode> = {
  1: <User size={14} color="#FFF" />,
  2: <Users size={14} color="#FFF" />,
  3: <Building2 size={14} color="#FFF" />,
  4: <Shield size={14} color="#FFF" />,
  5: <Crown size={14} color="#FFF" />,
};

export interface TierHistoryEntry {
  id: string;
  tierLevel: ApprovalTierLevel;
  tierName: string;
  action: WorkflowStepAction;
  actionBy: string;
  actionById: string;
  actionByRole?: string;
  actionAt: string;
  comments?: string;
  rejectionReason?: string;
  delegatedFrom?: string;
  delegatedFromName?: string;
  escalatedFrom?: string;
  returnedToTier?: ApprovalTierLevel;
  duration?: number;
  isCurrentTier?: boolean;
}

interface TierHistoryTimelineProps {
  history: TierHistoryEntry[];
  onEntryPress?: (entry: TierHistoryEntry) => void;
  showComments?: boolean;
  showDuration?: boolean;
  showDelegation?: boolean;
  expandable?: boolean;
  maxVisibleEntries?: number;
  emptyMessage?: string;
}

export function TierHistoryTimeline({
  history,
  onEntryPress,
  showComments = true,
  showDuration = true,
  showDelegation = true,
  expandable = true,
  maxVisibleEntries = 5,
  emptyMessage = 'No tier history available',
}: TierHistoryTimelineProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const sortedHistory = useMemo(() => 
    [...history].sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime()),
  [history]);

  const visibleHistory = useMemo(() => {
    if (!expandable || isExpanded) return sortedHistory;
    return sortedHistory.slice(0, maxVisibleEntries);
  }, [sortedHistory, expandable, isExpanded, maxVisibleEntries]);

  const hasMore = expandable && sortedHistory.length > maxVisibleEntries;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHrs = hours % 24;
    return remainingHrs > 0 ? `${days}d ${remainingHrs}h` : `${days}d`;
  };

  const getActionConfig = (action: WorkflowStepAction) => {
    switch (action) {
      case 'approved':
        return { 
          bg: '#10B98120', 
          color: '#10B981', 
          label: 'Approved', 
          icon: <CheckCircle2 size={16} color="#10B981" />,
          indicatorColor: '#10B981',
        };
      case 'rejected':
        return { 
          bg: '#EF444420', 
          color: '#EF4444', 
          label: 'Rejected', 
          icon: <XCircle size={16} color="#EF4444" />,
          indicatorColor: '#EF4444',
        };
      case 'returned':
        return { 
          bg: '#F59E0B20', 
          color: '#F59E0B', 
          label: 'Returned', 
          icon: <RefreshCw size={16} color="#F59E0B" />,
          indicatorColor: '#F59E0B',
        };
      case 'escalated':
        return { 
          bg: '#F59E0B20', 
          color: '#F59E0B', 
          label: 'Escalated', 
          icon: <AlertTriangle size={16} color="#F59E0B" />,
          indicatorColor: '#F59E0B',
        };
      case 'skipped':
        return { 
          bg: '#6B728020', 
          color: '#6B7280', 
          label: 'Skipped', 
          icon: <ArrowRight size={16} color="#6B7280" />,
          indicatorColor: '#6B7280',
        };
      case 'delegated':
        return { 
          bg: '#8B5CF620', 
          color: '#8B5CF6', 
          label: 'Delegated', 
          icon: <Users size={16} color="#8B5CF6" />,
          indicatorColor: '#8B5CF6',
        };
      case 'reassigned':
        return { 
          bg: '#3B82F620', 
          color: '#3B82F6', 
          label: 'Reassigned', 
          icon: <CornerDownRight size={16} color="#3B82F6" />,
          indicatorColor: '#3B82F6',
        };
      case 'resubmitted':
        return { 
          bg: '#10B98120', 
          color: '#10B981', 
          label: 'Resubmitted', 
          icon: <RefreshCw size={16} color="#10B981" />,
          indicatorColor: '#10B981',
        };
      case 'cancelled':
        return { 
          bg: '#6B728020', 
          color: '#6B7280', 
          label: 'Cancelled', 
          icon: <XCircle size={16} color="#6B7280" />,
          indicatorColor: '#6B7280',
        };
      default:
        return { 
          bg: '#9CA3AF20', 
          color: '#9CA3AF', 
          label: 'Pending', 
          icon: <Clock size={16} color="#9CA3AF" />,
          indicatorColor: '#9CA3AF',
        };
    }
  };

  if (history.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <History size={32} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyMessage}</Text>
      </View>
    );
  }

  const renderHistoryEntry = (entry: TierHistoryEntry, index: number) => {
    const isLast = index === visibleHistory.length - 1;
    const actionConfig = getActionConfig(entry.action);
    const tierColor = tierLevelColors[entry.tierLevel];

    return (
      <Pressable
        key={entry.id}
        style={[
          styles.entryContainer,
          entry.isCurrentTier && styles.entryContainerCurrent,
          entry.isCurrentTier && { borderColor: tierColor, backgroundColor: `${tierColor}08` },
        ]}
        onPress={() => onEntryPress?.(entry)}
        disabled={!onEntryPress}
      >
        <View style={styles.entryRow}>
          <View style={styles.timelineColumn}>
            <View 
              style={[
                styles.timelineIndicator,
                { backgroundColor: actionConfig.indicatorColor },
              ]}
            >
              {actionConfig.icon}
            </View>
            {!isLast && (
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
            )}
          </View>

          <View style={[styles.entryContent, { borderColor: colors.border }]}>
            <View style={styles.entryHeader}>
              <View style={styles.entryHeaderLeft}>
                <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                  {tierLevelIcons[entry.tierLevel]}
                  <Text style={styles.tierBadgeText}>Tier {entry.tierLevel}</Text>
                </View>
                <View style={[styles.actionBadge, { backgroundColor: actionConfig.bg }]}>
                  <Text style={[styles.actionBadgeText, { color: actionConfig.color }]}>
                    {actionConfig.label}
                  </Text>
                </View>
                {entry.isCurrentTier && (
                  <View style={[styles.currentBadge, { backgroundColor: `${tierColor}20` }]}>
                    <Zap size={10} color={tierColor} />
                    <Text style={[styles.currentBadgeText, { color: tierColor }]}>Current</Text>
                  </View>
                )}
              </View>
              {showDuration && entry.duration && (
                <View style={[styles.durationBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Clock size={10} color={colors.textTertiary} />
                  <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                    {formatDuration(entry.duration)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.tierName, { color: colors.text }]} numberOfLines={1}>
              {entry.tierName}
            </Text>

            <View style={styles.actorSection}>
              <View style={[styles.actorAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                <User size={14} color={colors.textSecondary} />
              </View>
              <View style={styles.actorInfo}>
                <Text style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
                  {entry.actionBy}
                </Text>
                {entry.actionByRole && (
                  <Text style={[styles.actorRole, { color: colors.textTertiary }]} numberOfLines={1}>
                    {entry.actionByRole}
                  </Text>
                )}
              </View>
            </View>

            {showDelegation && entry.delegatedFrom && (
              <View style={[styles.delegationInfo, { backgroundColor: '#8B5CF610' }]}>
                <CornerDownRight size={12} color="#8B5CF6" />
                <Text style={styles.delegationText}>
                  Delegated from {entry.delegatedFromName || entry.delegatedFrom}
                </Text>
              </View>
            )}

            {entry.returnedToTier && (
              <View style={[styles.returnInfo, { backgroundColor: '#F59E0B10' }]}>
                <RefreshCw size={12} color="#F59E0B" />
                <Text style={styles.returnText}>
                  Returned to Tier {entry.returnedToTier}
                </Text>
              </View>
            )}

            {showComments && entry.comments && (
              <View style={[styles.commentsSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.commentHeader}>
                  <MessageSquare size={12} color={colors.textSecondary} />
                  <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>Comments</Text>
                </View>
                <Text style={[styles.commentText, { color: colors.text }]}>
                  {entry.comments}
                </Text>
              </View>
            )}

            {showComments && entry.rejectionReason && (
              <View style={[styles.rejectionSection, { backgroundColor: '#EF444410' }]}>
                <View style={styles.commentHeader}>
                  <XCircle size={12} color="#EF4444" />
                  <Text style={[styles.commentLabel, { color: '#EF4444' }]}>Rejection Reason</Text>
                </View>
                <Text style={[styles.rejectionText, { color: colors.text }]}>
                  {entry.rejectionReason}
                </Text>
              </View>
            )}

            <View style={styles.timestampSection}>
              <View style={styles.timestampRow}>
                <Calendar size={12} color={colors.textTertiary} />
                <Text style={[styles.timestampFull, { color: colors.textSecondary }]}>
                  {formatDateTime(entry.actionAt)}
                </Text>
              </View>
              <Text style={[styles.timestampRelative, { color: colors.textTertiary }]}>
                {formatTimeAgo(entry.actionAt)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {visibleHistory.map((entry, index) => renderHistoryEntry(entry, index))}
      
      {hasMore && (
        <Pressable
          style={[styles.expandButton, { borderColor: colors.border }]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} color={colors.primary} />
              <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                Show Less
              </Text>
            </>
          ) : (
            <>
              <ChevronDown size={16} color={colors.primary} />
              <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                Show {sortedHistory.length - maxVisibleEntries} More
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function TierHistorySummary({
  history,
  showLatest = 3,
}: {
  history: TierHistoryEntry[];
  showLatest?: number;
}) {
  const { colors } = useTheme();

  const latestHistory = useMemo(() => 
    [...history]
      .sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime())
      .slice(0, showLatest),
  [history, showLatest]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  const getActionIcon = (action: WorkflowStepAction) => {
    switch (action) {
      case 'approved': return <CheckCircle2 size={12} color="#10B981" />;
      case 'rejected': return <XCircle size={12} color="#EF4444" />;
      case 'returned': return <RefreshCw size={12} color="#F59E0B" />;
      case 'escalated': return <AlertTriangle size={12} color="#F59E0B" />;
      default: return <Clock size={12} color="#9CA3AF" />;
    }
  };

  if (latestHistory.length === 0) return null;

  return (
    <View style={[styles.summaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.summaryHeader}>
        <History size={14} color={colors.textSecondary} />
        <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Recent Activity</Text>
      </View>
      {latestHistory.map((entry, index) => (
        <View 
          key={entry.id}
          style={[
            styles.summaryItem,
            { borderBottomColor: colors.border },
            index === latestHistory.length - 1 && styles.summaryItemLast,
          ]}
        >
          <View style={styles.summaryItemLeft}>
            {getActionIcon(entry.action)}
            <View style={styles.summaryItemInfo}>
              <Text style={[styles.summaryItemAction, { color: colors.text }]} numberOfLines={1}>
                Tier {entry.tierLevel} - {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
              </Text>
              <Text style={[styles.summaryItemActor, { color: colors.textTertiary }]} numberOfLines={1}>
                by {entry.actionBy}
              </Text>
            </View>
          </View>
          <Text style={[styles.summaryItemTime, { color: colors.textTertiary }]}>
            {formatTimeAgo(entry.actionAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function TierActionTimestamp({
  actionAt,
  actionBy,
  action,
  size = 'medium',
  showRelative = true,
}: {
  actionAt: string;
  actionBy?: string;
  action?: WorkflowStepAction;
  size?: 'small' | 'medium' | 'large';
  showRelative?: boolean;
}) {
  const { colors } = useTheme();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  const getActionColor = (a?: WorkflowStepAction) => {
    switch (a) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const sizeConfig = {
    small: { text: 10, icon: 10, gap: 4 },
    medium: { text: 12, icon: 12, gap: 6 },
    large: { text: 14, icon: 14, gap: 8 },
  }[size];

  return (
    <View style={[styles.timestampContainer, { gap: sizeConfig.gap }]}>
      <View style={styles.timestampMain}>
        <Calendar size={sizeConfig.icon} color={colors.textTertiary} />
        <Text style={[styles.timestampText, { color: colors.textSecondary, fontSize: sizeConfig.text }]}>
          {formatDateTime(actionAt)}
        </Text>
      </View>
      {showRelative && (
        <Text style={[styles.timestampAgo, { color: getActionColor(action), fontSize: sizeConfig.text - 1 }]}>
          {formatTimeAgo(actionAt)}
        </Text>
      )}
      {actionBy && (
        <View style={styles.timestampActor}>
          <User size={sizeConfig.icon - 2} color={colors.textTertiary} />
          <Text style={[styles.timestampActorText, { color: colors.textTertiary, fontSize: sizeConfig.text - 1 }]} numberOfLines={1}>
            {actionBy}
          </Text>
        </View>
      )}
    </View>
  );
}

export function TierActorCard({
  name,
  role,
  action,
  actionAt,
  comments,
  tierLevel,
  isRequired,
  size = 'medium',
}: {
  name: string;
  role?: string;
  action?: WorkflowStepAction;
  actionAt?: string;
  comments?: string;
  tierLevel?: ApprovalTierLevel;
  isRequired?: boolean;
  size?: 'small' | 'medium' | 'large';
}) {
  const { colors } = useTheme();

  const getActionConfig = (a?: WorkflowStepAction) => {
    switch (a) {
      case 'approved':
        return { bg: '#10B98120', color: '#10B981', label: 'Approved', icon: <CheckCircle2 size={14} color="#10B981" /> };
      case 'rejected':
        return { bg: '#EF444420', color: '#EF4444', label: 'Rejected', icon: <XCircle size={14} color="#EF4444" /> };
      case 'returned':
        return { bg: '#F59E0B20', color: '#F59E0B', label: 'Returned', icon: <RefreshCw size={14} color="#F59E0B" /> };
      default:
        return { bg: '#9CA3AF20', color: '#9CA3AF', label: 'Pending', icon: <Clock size={14} color="#9CA3AF" /> };
    }
  };

  const actionConfig = getActionConfig(action);
  const tierColor = tierLevel ? tierLevelColors[tierLevel] : colors.primary;

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHrs > 0) return `${diffHrs}h ago`;
    return 'Just now';
  };

  const sizeConfig = {
    small: { avatar: 28, name: 12, role: 10, padding: 10 },
    medium: { avatar: 36, name: 14, role: 12, padding: 12 },
    large: { avatar: 44, name: 16, role: 14, padding: 14 },
  }[size];

  return (
    <View style={[
      styles.actorCard,
      { 
        backgroundColor: colors.surface, 
        borderColor: colors.border,
        padding: sizeConfig.padding,
      }
    ]}>
      <View style={styles.actorCardHeader}>
        <View style={[styles.actorCardAvatar, { width: sizeConfig.avatar, height: sizeConfig.avatar, backgroundColor: `${tierColor}20` }]}>
          <User size={sizeConfig.avatar * 0.45} color={tierColor} />
        </View>
        <View style={styles.actorCardInfo}>
          <View style={styles.actorCardNameRow}>
            <Text style={[styles.actorCardName, { color: colors.text, fontSize: sizeConfig.name }]} numberOfLines={1}>
              {name}
            </Text>
            {isRequired && (
              <View style={[styles.requiredBadge, { backgroundColor: '#EF444415' }]}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          {role && (
            <Text style={[styles.actorCardRole, { color: colors.textTertiary, fontSize: sizeConfig.role }]} numberOfLines={1}>
              {role}
            </Text>
          )}
        </View>
        <View style={[styles.actorCardActionBadge, { backgroundColor: actionConfig.bg }]}>
          {actionConfig.icon}
        </View>
      </View>

      {actionAt && (
        <View style={styles.actorCardTimestamp}>
          <Text style={[styles.actorCardTimestampText, { color: colors.textSecondary }]}>
            {actionConfig.label} {formatTimeAgo(actionAt)}
          </Text>
        </View>
      )}

      {comments && (
        <View style={[styles.actorCardComments, { backgroundColor: colors.backgroundSecondary }]}>
          <MessageSquare size={12} color={colors.textSecondary} />
          <Text style={[styles.actorCardCommentText, { color: colors.text }]} numberOfLines={3}>
            {comments}
          </Text>
        </View>
      )}
    </View>
  );
}

export function TierDecisionNote({
  tierLevel,
  action,
  actionBy,
  comments,
  rejectionReason,
  returnedToTier,
}: {
  tierLevel: ApprovalTierLevel;
  action: WorkflowStepAction;
  actionBy: string;
  comments?: string;
  rejectionReason?: string;
  returnedToTier?: ApprovalTierLevel;
}) {
  const { colors } = useTheme();
  const tierColor = tierLevelColors[tierLevel];

  const hasContent = comments || rejectionReason || returnedToTier;
  if (!hasContent) return null;

  return (
    <View style={[styles.decisionNote, { borderLeftColor: tierColor }]}>
      <View style={styles.decisionNoteHeader}>
        <View style={[styles.decisionNoteTierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.decisionNoteTierText}>T{tierLevel}</Text>
        </View>
        <Text style={[styles.decisionNoteActor, { color: colors.textSecondary }]}>
          {actionBy}
        </Text>
      </View>

      {rejectionReason && (
        <View style={[styles.decisionNoteSection, { backgroundColor: '#EF444410' }]}>
          <XCircle size={14} color="#EF4444" />
          <View style={styles.decisionNoteSectionContent}>
            <Text style={[styles.decisionNoteSectionLabel, { color: '#EF4444' }]}>Rejection Reason</Text>
            <Text style={[styles.decisionNoteSectionText, { color: colors.text }]}>{rejectionReason}</Text>
          </View>
        </View>
      )}

      {returnedToTier && (
        <View style={[styles.decisionNoteSection, { backgroundColor: '#F59E0B10' }]}>
          <RefreshCw size={14} color="#F59E0B" />
          <View style={styles.decisionNoteSectionContent}>
            <Text style={[styles.decisionNoteSectionLabel, { color: '#F59E0B' }]}>Returned</Text>
            <Text style={[styles.decisionNoteSectionText, { color: colors.text }]}>
              Sent back to Tier {returnedToTier} for revision
            </Text>
          </View>
        </View>
      )}

      {comments && (
        <View style={[styles.decisionNoteSection, { backgroundColor: colors.backgroundSecondary }]}>
          <MessageSquare size={14} color={colors.textSecondary} />
          <View style={styles.decisionNoteSectionContent}>
            <Text style={[styles.decisionNoteSectionLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.decisionNoteSectionText, { color: colors.text }]}>{comments}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function convertStepHistoryToTierHistory(
  stepHistory: WorkflowStepHistory[],
  tierNameMap?: Record<string, string>,
): TierHistoryEntry[] {
  return stepHistory.map(step => ({
    id: step.id,
    tierLevel: step.tierLevel || 1,
    tierName: tierNameMap?.[step.stepId] || step.stepName,
    action: step.action,
    actionBy: step.actionBy,
    actionById: step.actionById,
    actionAt: step.actionAt,
    comments: step.comments,
    rejectionReason: step.rejectionReason,
    delegatedFrom: step.delegatedFrom,
    escalatedFrom: step.escalatedFrom,
    returnedToTier: step.returnedToTier,
  }));
}

export function convertRejectionHistoryToTierHistory(
  rejectionHistory: RejectionHistoryEntry[],
  tierNameMap?: Record<ApprovalTierLevel, string>,
): TierHistoryEntry[] {
  return rejectionHistory.map(entry => ({
    id: entry.id,
    tierLevel: entry.tierLevel,
    tierName: tierNameMap?.[entry.tierLevel] || `Tier ${entry.tierLevel}`,
    action: 'rejected' as WorkflowStepAction,
    actionBy: entry.rejectedBy,
    actionById: entry.rejectedById,
    actionAt: entry.rejectedAt,
    rejectionReason: entry.reason,
    returnedToTier: entry.returnedToTier,
  }));
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  entryContainer: {
    borderRadius: 0,
  },
  entryContainerCurrent: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 40,
  },
  timelineIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 4,
  },
  entryContent: {
    flex: 1,
    paddingBottom: 16,
    gap: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  actorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actorInfo: {
    flex: 1,
    gap: 1,
  },
  actorName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  actorRole: {
    fontSize: 11,
  },
  delegationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  delegationText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  returnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  returnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  commentsSection: {
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 12,
    lineHeight: 18,
  },
  rejectionSection: {
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  rejectionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  timestampSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampFull: {
    fontSize: 11,
  },
  timestampRelative: {
    fontSize: 11,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  summaryContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryItemLast: {
    borderBottomWidth: 0,
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryItemInfo: {
    flex: 1,
    gap: 2,
  },
  summaryItemAction: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  summaryItemActor: {
    fontSize: 11,
  },
  summaryItemTime: {
    fontSize: 11,
  },
  timestampContainer: {
    alignItems: 'flex-start',
  },
  timestampMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {},
  timestampAgo: {
    fontWeight: '500' as const,
  },
  timestampActor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestampActorText: {},
  actorCard: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  actorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actorCardAvatar: {
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actorCardInfo: {
    flex: 1,
    gap: 2,
  },
  actorCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actorCardName: {
    fontWeight: '600' as const,
  },
  actorCardRole: {},
  actorCardActionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requiredBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  requiredText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '600' as const,
  },
  actorCardTimestamp: {
    marginTop: 2,
  },
  actorCardTimestampText: {
    fontSize: 12,
  },
  actorCardComments: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  actorCardCommentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  decisionNote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    gap: 10,
  },
  decisionNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decisionNoteTierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  decisionNoteTierText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  decisionNoteActor: {
    fontSize: 12,
  },
  decisionNoteSection: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  decisionNoteSectionContent: {
    flex: 1,
    gap: 4,
  },
  decisionNoteSectionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  decisionNoteSectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default TierHistoryTimeline;
