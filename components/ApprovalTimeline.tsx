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
  UserCheck,
  RefreshCw,
  SkipForward,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface TimelineStep {
  id: string;
  stepOrder: number;
  stepName: string;
  stepType: 'approval' | 'review' | 'notification' | 'condition' | 'parallel';
  status: 'pending' | 'completed' | 'rejected' | 'skipped' | 'current' | 'escalated';
  approvers: {
    id: string;
    name: string;
    role?: string;
    action?: 'approved' | 'rejected' | 'delegated' | 'escalated' | 'skipped' | 'reassigned';
    actionAt?: string;
    comments?: string;
    delegatedFrom?: string;
  }[];
  requiredApprovals: number;
  completedApprovals: number;
  escalation?: {
    timeoutHours: number;
    action: string;
    triggered: boolean;
  };
}

interface ApprovalTimelineProps {
  steps: TimelineStep[];
  currentStepOrder: number;
  onStepPress?: (step: TimelineStep) => void;
  expandedStepId?: string;
  onToggleExpand?: (stepId: string) => void;
  showDetails?: boolean;
}

export function ApprovalTimeline({
  steps,
  currentStepOrder,
  onStepPress,
  expandedStepId,
  onToggleExpand,
  showDetails = true,
}: ApprovalTimelineProps) {
  const { colors } = useTheme();

  const sortedSteps = useMemo(() => 
    [...steps].sort((a, b) => a.stepOrder - b.stepOrder),
  [steps]);

  const getStepStatusColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'current': return colors.primary;
      case 'escalated': return '#F59E0B';
      case 'skipped': return '#6B7280';
      default: return colors.border;
    }
  };

  const getStepStatusIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} color="#FFF" />;
      case 'rejected':
        return <XCircle size={20} color="#FFF" />;
      case 'current':
        return <Clock size={20} color="#FFF" />;
      case 'escalated':
        return <AlertTriangle size={20} color="#FFF" />;
      case 'skipped':
        return <SkipForward size={20} color="#FFF" />;
      default:
        return <Text style={styles.pendingNumber}>{status === 'pending' ? '?' : ''}</Text>;
    }
  };

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle2 size={14} color="#10B981" />;
      case 'rejected':
        return <XCircle size={14} color="#EF4444" />;
      case 'delegated':
        return <UserCheck size={14} color="#8B5CF6" />;
      case 'escalated':
        return <AlertTriangle size={14} color="#F59E0B" />;
      case 'reassigned':
        return <RefreshCw size={14} color="#3B82F6" />;
      case 'skipped':
        return <SkipForward size={14} color="#6B7280" />;
      default:
        return <Clock size={14} color={colors.textTertiary} />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderApproverRow = (approver: TimelineStep['approvers'][0], isLast: boolean) => (
    <View 
      key={approver.id} 
      style={[
        styles.approverRow, 
        { borderBottomColor: colors.border },
        isLast && styles.approverRowLast,
      ]}
    >
      <View style={styles.approverInfo}>
        <View style={[styles.approverAvatar, { backgroundColor: colors.backgroundSecondary }]}>
          <User size={14} color={colors.textSecondary} />
        </View>
        <View style={styles.approverDetails}>
          <Text style={[styles.approverName, { color: colors.text }]}>{approver.name}</Text>
          {approver.role && (
            <Text style={[styles.approverRole, { color: colors.textTertiary }]}>{approver.role}</Text>
          )}
        </View>
      </View>
      <View style={styles.approverAction}>
        {getActionIcon(approver.action)}
        {approver.actionAt && (
          <Text style={[styles.actionDate, { color: colors.textTertiary }]}>
            {formatDate(approver.actionAt)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderStep = (step: TimelineStep, index: number) => {
    const isLast = index === sortedSteps.length - 1;
    const statusColor = getStepStatusColor(step.status);
    const isExpanded = expandedStepId === step.id;
    const hasApprovers = step.approvers.length > 0;
    const hasComments = step.approvers.some(a => a.comments);

    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={styles.stepIndicatorColumn}>
          <View style={[styles.stepIndicator, { backgroundColor: statusColor }]}>
            {getStepStatusIcon(step.status)}
          </View>
          {!isLast && (
            <View 
              style={[
                styles.stepLine, 
                { 
                  backgroundColor: step.status === 'completed' || step.status === 'skipped' 
                    ? '#10B981' 
                    : colors.border 
                },
              ]} 
            />
          )}
        </View>

        <Pressable 
          style={[
            styles.stepContent, 
            { 
              backgroundColor: step.status === 'current' ? `${colors.primary}08` : colors.surface,
              borderColor: step.status === 'current' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            if (onToggleExpand && hasApprovers) {
              onToggleExpand(step.id);
            } else if (onStepPress) {
              onStepPress(step);
            }
          }}
        >
          <View style={styles.stepHeader}>
            <View style={styles.stepHeaderLeft}>
              <Text style={[styles.stepOrder, { color: statusColor }]}>Step {step.stepOrder}</Text>
              <Text style={[styles.stepName, { color: colors.text }]}>{step.stepName}</Text>
            </View>
            <View style={styles.stepHeaderRight}>
              {step.status === 'current' && step.completedApprovals < step.requiredApprovals && (
                <View style={[styles.progressBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.progressText, { color: colors.primary }]}>
                    {step.completedApprovals}/{step.requiredApprovals}
                  </Text>
                </View>
              )}
              {hasApprovers && showDetails && (
                isExpanded 
                  ? <ChevronUp size={18} color={colors.textTertiary} />
                  : <ChevronDown size={18} color={colors.textTertiary} />
              )}
            </View>
          </View>

          {step.status === 'escalated' && step.escalation && (
            <View style={[styles.escalationBadge, { backgroundColor: '#F59E0B15' }]}>
              <AlertTriangle size={12} color="#F59E0B" />
              <Text style={[styles.escalationText, { color: '#F59E0B' }]}>
                Escalated after {step.escalation.timeoutHours}h timeout
              </Text>
            </View>
          )}

          {showDetails && isExpanded && hasApprovers && (
            <View style={[styles.approversSection, { borderTopColor: colors.border }]}>
              {step.approvers.map((approver, i) => 
                renderApproverRow(approver, i === step.approvers.length - 1)
              )}
              {hasComments && (
                <View style={styles.commentsSection}>
                  {step.approvers.filter(a => a.comments).map(approver => (
                    <View 
                      key={`comment-${approver.id}`} 
                      style={[styles.commentBox, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <View style={styles.commentHeader}>
                        <MessageSquare size={12} color={colors.textTertiary} />
                        <Text style={[styles.commentAuthor, { color: colors.textSecondary }]}>
                          {approver.name}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: colors.text }]}>
                        {approver.comments}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {sortedSteps.map((step, index) => renderStep(step, index))}
    </View>
  );
}

export function ApprovalProgressBar({
  totalSteps,
  completedSteps,
  currentStep,
  status,
}: {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
}) {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'escalated': return '#F59E0B';
      case 'cancelled': return '#6B7280';
      default: return colors.primary;
    }
  };

  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarHeader}>
        <Text style={[styles.progressBarLabel, { color: colors.textSecondary }]}>
          Progress: Step {currentStep} of {totalSteps}
        </Text>
        <Text style={[styles.progressBarPercent, { color: getStatusColor() }]}>
          {Math.round(progressPercent)}%
        </Text>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              backgroundColor: getStatusColor(),
              width: `${progressPercent}%`,
            },
          ]} 
        />
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBarStep,
              {
                left: `${((index + 1) / totalSteps) * 100}%`,
                backgroundColor: index < completedSteps ? getStatusColor() : colors.background,
                borderColor: index < completedSteps ? getStatusColor() : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.progressBarStepLabels}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <Text
            key={index}
            style={[
              styles.progressBarStepLabel,
              { 
                color: index + 1 === currentStep ? colors.primary : colors.textTertiary,
                fontWeight: index + 1 === currentStep ? '600' as const : '400' as const,
              },
            ]}
          >
            {index + 1}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function MultiTierIndicator({
  tiers,
  compact = false,
}: {
  tiers: {
    tier: number;
    status: 'pending' | 'approved' | 'rejected';
    approverRole: string;
    approverName?: string;
  }[];
  compact?: boolean;
}) {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  if (compact) {
    return (
      <View style={styles.compactTierContainer}>
        {tiers.map((tier, index) => (
          <View key={tier.tier} style={styles.compactTierItem}>
            <View 
              style={[
                styles.compactTierBadge, 
                { backgroundColor: getStatusColor(tier.status) },
              ]}
            >
              <Text style={styles.compactTierNumber}>{tier.tier}</Text>
            </View>
            {index < tiers.length - 1 && (
              <View style={[styles.compactTierConnector, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.tierContainer}>
      {tiers.map((tier, index) => (
        <View key={tier.tier} style={styles.tierItem}>
          <View style={styles.tierIndicatorWrapper}>
            <View 
              style={[
                styles.tierIndicator, 
                { backgroundColor: getStatusColor(tier.status) },
              ]}
            >
              {tier.status === 'approved' && <CheckCircle2 size={16} color="#FFF" />}
              {tier.status === 'rejected' && <XCircle size={16} color="#FFF" />}
              {tier.status === 'pending' && <Text style={styles.tierNumber}>{tier.tier}</Text>}
            </View>
            {index < tiers.length - 1 && (
              <View 
                style={[
                  styles.tierLine, 
                  { 
                    backgroundColor: tier.status === 'approved' ? '#10B981' : colors.border,
                  },
                ]} 
              />
            )}
          </View>
          <View style={styles.tierInfo}>
            <Text style={[styles.tierRole, { color: colors.text }]}>{tier.approverRole}</Text>
            {tier.approverName && (
              <Text style={[styles.tierName, { color: colors.textSecondary }]}>{tier.approverName}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    width: 40,
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: 3,
    flex: 1,
    minHeight: 20,
  },
  stepContent: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  stepHeaderLeft: {
    flex: 1,
  },
  stepHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepOrder: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  stepName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  pendingNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  escalationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  escalationText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  approversSection: {
    borderTopWidth: 1,
  },
  approverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  approverRowLast: {
    borderBottomWidth: 0,
  },
  approverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  approverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approverDetails: {
    gap: 1,
  },
  approverName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  approverRole: {
    fontSize: 11,
  },
  approverAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionDate: {
    fontSize: 11,
  },
  commentsSection: {
    padding: 14,
    paddingTop: 6,
    gap: 8,
  },
  commentBox: {
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarLabel: {
    fontSize: 12,
  },
  progressBarPercent: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarStep: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginLeft: -6,
  },
  progressBarStepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressBarStepLabel: {
    fontSize: 10,
    width: 20,
    textAlign: 'center' as const,
  },
  tierContainer: {
    gap: 0,
  },
  tierItem: {
    flexDirection: 'row',
    gap: 12,
  },
  tierIndicatorWrapper: {
    alignItems: 'center',
    width: 32,
  },
  tierIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierLine: {
    width: 2,
    height: 24,
  },
  tierInfo: {
    flex: 1,
    paddingBottom: 20,
  },
  tierRole: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tierName: {
    fontSize: 12,
    marginTop: 2,
  },
  tierNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  compactTierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactTierItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTierBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTierNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  compactTierConnector: {
    width: 16,
    height: 2,
    marginHorizontal: 2,
  },
});

export default ApprovalTimeline;
