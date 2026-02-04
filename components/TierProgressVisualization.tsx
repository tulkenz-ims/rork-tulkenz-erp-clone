import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  User,
  Users,
  Shield,
  Crown,
  Building2,
  ArrowRight,
  RefreshCw,
  Zap,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ApprovalTierLevel, WorkflowStepAction } from '@/types/approvalWorkflows';

export type TierStatus = 'pending' | 'current' | 'approved' | 'rejected' | 'returned' | 'skipped' | 'escalated';

export interface TierApproverInfo {
  id: string;
  name: string;
  role: string;
  type: 'role' | 'user' | 'manager' | 'department_head' | 'executive';
  action?: WorkflowStepAction;
  actionAt?: string;
  isRequired: boolean;
  comments?: string;
}

export interface TierProgressItem {
  id: string;
  level: ApprovalTierLevel;
  name: string;
  description?: string;
  status: TierStatus;
  approvers: TierApproverInfo[];
  requiredApprovals: number;
  completedApprovals: number;
  startedAt?: string;
  completedAt?: string;
  escalatedAt?: string;
  autoEscalateHours?: number;
  thresholdLabel?: string;
  returnedReason?: string;
  color?: string;
}

interface TierProgressVisualizationProps {
  tiers: TierProgressItem[];
  currentTierLevel: ApprovalTierLevel;
  onTierPress?: (tier: TierProgressItem) => void;
  showApprovers?: boolean;
  showTimestamps?: boolean;
  compact?: boolean;
  animated?: boolean;
}

const tierLevelColors: Record<ApprovalTierLevel, string> = {
  1: '#10B981',
  2: '#3B82F6',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#7C3AED',
};

const tierLevelIcons: Record<ApprovalTierLevel, React.ReactNode> = {
  1: <User size={16} color="#FFF" />,
  2: <Users size={16} color="#FFF" />,
  3: <Building2 size={16} color="#FFF" />,
  4: <Shield size={16} color="#FFF" />,
  5: <Crown size={16} color="#FFF" />,
};

export function TierProgressVisualization({
  tiers,
  currentTierLevel,
  onTierPress,
  showApprovers = true,
  showTimestamps = true,
  compact = false,
  animated = true,
}: TierProgressVisualizationProps) {
  const { colors } = useTheme();

  const sortedTiers = useMemo(() => 
    [...tiers].sort((a, b) => a.level - b.level),
  [tiers]);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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

  const getStatusColor = (status: TierStatus, level: ApprovalTierLevel) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      case 'current': return tierLevelColors[level];
      case 'escalated': return '#F59E0B';
      case 'skipped': return '#6B7280';
      default: return colors.border;
    }
  };

  const getStatusIcon = (status: TierStatus, level: ApprovalTierLevel) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={compact ? 16 : 20} color="#FFF" />;
      case 'rejected':
        return <XCircle size={compact ? 16 : 20} color="#FFF" />;
      case 'returned':
        return <RefreshCw size={compact ? 16 : 20} color="#FFF" />;
      case 'current':
        return tierLevelIcons[level];
      case 'escalated':
        return <AlertTriangle size={compact ? 16 : 20} color="#FFF" />;
      case 'skipped':
        return <ArrowRight size={compact ? 16 : 20} color="#FFF" />;
      default:
        return <Clock size={compact ? 16 : 20} color={colors.textTertiary} />;
    }
  };

  const getApproverActionIcon = (action?: WorkflowStepAction) => {
    switch (action) {
      case 'approved': return <CheckCircle2 size={12} color="#10B981" />;
      case 'rejected': return <XCircle size={12} color="#EF4444" />;
      case 'returned': return <RefreshCw size={12} color="#F59E0B" />;
      case 'escalated': return <AlertTriangle size={12} color="#F59E0B" />;
      case 'skipped': return <ArrowRight size={12} color="#6B7280" />;
      default: return <Clock size={12} color={colors.textTertiary} />;
    }
  };

  const renderApprover = (approver: TierApproverInfo, isLast: boolean) => (
    <View 
      key={approver.id}
      style={[
        styles.approverItem,
        { borderBottomColor: colors.border },
        isLast && styles.approverItemLast,
      ]}
    >
      <View style={styles.approverLeft}>
        <View style={[styles.approverAvatar, { backgroundColor: colors.backgroundSecondary }]}>
          <User size={12} color={colors.textSecondary} />
        </View>
        <View style={styles.approverInfo}>
          <Text style={[styles.approverName, { color: colors.text }]} numberOfLines={1}>
            {approver.name || approver.role}
          </Text>
          <View style={styles.approverMeta}>
            <Text style={[styles.approverRole, { color: colors.textTertiary }]}>
              {approver.role}
            </Text>
            {approver.isRequired && (
              <View style={[styles.requiredBadge, { backgroundColor: '#EF444415' }]}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.approverRight}>
        {getApproverActionIcon(approver.action)}
        {approver.actionAt && showTimestamps && (
          <Text style={[styles.approverTime, { color: colors.textTertiary }]}>
            {formatTimeAgo(approver.actionAt)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderTier = (tier: TierProgressItem, index: number) => {
    const isLast = index === sortedTiers.length - 1;
    const isCurrent = tier.status === 'current';
    const statusColor = getStatusColor(tier.status, tier.level);
    const tierColor = tier.color || tierLevelColors[tier.level];
    const isClickable = !!onTierPress;

    const lineColor = tier.status === 'approved' || tier.status === 'skipped' 
      ? '#10B981' 
      : colors.border;

    const cardBorderColor = isCurrent ? tierColor : colors.border;
    const cardBgColor = isCurrent ? `${tierColor}08` : colors.surface;

    return (
      <View key={tier.id} style={styles.tierRow}>
        <View style={styles.indicatorColumn}>
          <View 
            style={[
              styles.tierIndicator,
              compact && styles.tierIndicatorCompact,
              { 
                backgroundColor: statusColor,
                borderWidth: tier.status === 'pending' ? 2 : 0,
                borderColor: colors.border,
              },
            ]}
          >
            {getStatusIcon(tier.status, tier.level)}
          </View>
          {!isLast && (
            <View style={[styles.tierLine, { backgroundColor: lineColor }]} />
          )}
        </View>

        <Pressable
          style={[
            styles.tierCard,
            compact && styles.tierCardCompact,
            { 
              backgroundColor: cardBgColor,
              borderColor: cardBorderColor,
            },
          ]}
          onPress={() => onTierPress?.(tier)}
          disabled={!isClickable}
        >
          <View style={styles.tierHeader}>
            <View style={styles.tierHeaderLeft}>
              <View style={styles.tierLevelRow}>
                <View style={[styles.tierLevelBadge, { backgroundColor: tierColor }]}>
                  <Text style={styles.tierLevelText}>Tier {tier.level}</Text>
                </View>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: `${tierColor}20` }]}>
                    <Zap size={10} color={tierColor} />
                    <Text style={[styles.currentBadgeText, { color: tierColor }]}>Current</Text>
                  </View>
                )}
              </View>
              <Text 
                style={[styles.tierName, { color: colors.text }]}
                numberOfLines={compact ? 1 : 2}
              >
                {tier.name}
              </Text>
              {!compact && tier.description && (
                <Text 
                  style={[styles.tierDescription, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {tier.description}
                </Text>
              )}
            </View>
            {isClickable && (
              <ChevronRight size={18} color={colors.textTertiary} />
            )}
          </View>

          {tier.thresholdLabel && (
            <View style={[styles.thresholdBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>
                {tier.thresholdLabel}
              </Text>
            </View>
          )}

          {isCurrent && tier.requiredApprovals > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Approval Progress
                </Text>
                <Text style={[styles.progressValue, { color: tierColor }]}>
                  {tier.completedApprovals}/{tier.requiredApprovals}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      backgroundColor: tierColor,
                      width: `${(tier.completedApprovals / tier.requiredApprovals) * 100}%`,
                    },
                  ]} 
                />
              </View>
            </View>
          )}

          {tier.status === 'escalated' && tier.escalatedAt && (
            <View style={[styles.escalationAlert, { backgroundColor: '#F59E0B15' }]}>
              <AlertTriangle size={14} color="#F59E0B" />
              <Text style={styles.escalationText}>
                Escalated {formatTimeAgo(tier.escalatedAt)}
                {tier.autoEscalateHours && ` (after ${tier.autoEscalateHours}h)`}
              </Text>
            </View>
          )}

          {tier.status === 'returned' && tier.returnedReason && (
            <View style={[styles.returnedAlert, { backgroundColor: '#F59E0B15' }]}>
              <RefreshCw size={14} color="#F59E0B" />
              <Text style={[styles.returnedText, { color: '#F59E0B' }]} numberOfLines={2}>
                {tier.returnedReason}
              </Text>
            </View>
          )}

          {showApprovers && !compact && tier.approvers.length > 0 && (
            <View style={[styles.approversSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.approversLabel, { color: colors.textSecondary }]}>
                Approvers
              </Text>
              {tier.approvers.map((approver, i) => 
                renderApprover(approver, i === tier.approvers.length - 1)
              )}
            </View>
          )}

          {showTimestamps && (tier.startedAt || tier.completedAt) && (
            <View style={[styles.timestampSection, { borderTopColor: colors.border }]}>
              {tier.startedAt && (
                <View style={styles.timestampItem}>
                  <Text style={[styles.timestampLabel, { color: colors.textTertiary }]}>
                    Started:
                  </Text>
                  <Text style={[styles.timestampValue, { color: colors.textSecondary }]}>
                    {formatDateTime(tier.startedAt)}
                  </Text>
                </View>
              )}
              {tier.completedAt && (
                <View style={styles.timestampItem}>
                  <Text style={[styles.timestampLabel, { color: colors.textTertiary }]}>
                    Completed:
                  </Text>
                  <Text style={[styles.timestampValue, { color: colors.textSecondary }]}>
                    {formatDateTime(tier.completedAt)}
                  </Text>
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
      {sortedTiers.map((tier, index) => renderTier(tier, index))}
    </View>
  );
}

export function TierProgressSummary({
  tiers,
  currentTierLevel,
  totalTiers,
}: {
  tiers: TierProgressItem[];
  currentTierLevel: ApprovalTierLevel;
  totalTiers: number;
}) {
  const { colors } = useTheme();

  const completedTiers = tiers.filter(t => t.status === 'approved').length;
  const progressPercent = totalTiers > 0 ? (completedTiers / totalTiers) * 100 : 0;

  return (
    <View style={[styles.summaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Tier Progress</Text>
          <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
            Currently at Tier {currentTierLevel} of {totalTiers}
          </Text>
        </View>
        <View style={[styles.summaryBadge, { backgroundColor: tierLevelColors[currentTierLevel] }]}>
          <Text style={styles.summaryBadgeText}>{Math.round(progressPercent)}%</Text>
        </View>
      </View>

      <View style={styles.summaryTrack}>
        {Array.from({ length: totalTiers }).map((_, index) => {
          const level = (index + 1) as ApprovalTierLevel;
          const tier = tiers.find(t => t.level === level);
          const isCompleted = tier?.status === 'approved';
          const isCurrent = level === currentTierLevel;
          const tierColor = tierLevelColors[level];

          return (
            <View key={level} style={styles.summaryStep}>
              <View 
                style={[
                  styles.summaryDot,
                  {
                    backgroundColor: isCompleted ? tierColor : isCurrent ? tierColor : colors.border,
                    borderWidth: isCurrent ? 3 : 0,
                    borderColor: `${tierColor}40`,
                  },
                ]}
              >
                {isCompleted && <CheckCircle2 size={12} color="#FFF" />}
                {!isCompleted && <Text style={styles.summaryDotText}>{level}</Text>}
              </View>
              {index < totalTiers - 1 && (
                <View 
                  style={[
                    styles.summaryConnector,
                    { backgroundColor: isCompleted ? tierColor : colors.border },
                  ]} 
                />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.summaryLegend}>
        {Array.from({ length: totalTiers }).map((_, index) => {
          const level = (index + 1) as ApprovalTierLevel;
          return (
            <Text 
              key={level}
              style={[
                styles.summaryLegendText,
                { 
                  color: level === currentTierLevel ? tierLevelColors[level] : colors.textTertiary,
                  fontWeight: level === currentTierLevel ? '600' as const : '400' as const,
                },
              ]}
            >
              T{level}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export function CompactTierProgress({
  currentLevel,
  maxLevel,
  status,
}: {
  currentLevel: ApprovalTierLevel;
  maxLevel: ApprovalTierLevel;
  status: 'in_progress' | 'approved' | 'rejected' | 'returned';
}) {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      default: return tierLevelColors[currentLevel];
    }
  };

  return (
    <View style={styles.compactContainer}>
      {Array.from({ length: maxLevel }).map((_, index) => {
        const level = (index + 1) as ApprovalTierLevel;
        const isCompleted = level < currentLevel || status === 'approved';
        const isCurrent = level === currentLevel && status === 'in_progress';
        const tierColor = tierLevelColors[level];

        return (
          <View key={level} style={styles.compactStep}>
            <View 
              style={[
                styles.compactDot,
                {
                  backgroundColor: isCompleted || isCurrent ? tierColor : colors.border,
                  opacity: isCompleted ? 1 : isCurrent ? 1 : 0.4,
                },
              ]}
            >
              {isCompleted && <CheckCircle2 size={10} color="#FFF" />}
              {isCurrent && <Zap size={10} color="#FFF" />}
            </View>
            {index < maxLevel - 1 && (
              <View 
                style={[
                  styles.compactConnector,
                  { 
                    backgroundColor: isCompleted ? tierColor : colors.border,
                    opacity: isCompleted ? 1 : 0.4,
                  },
                ]} 
              />
            )}
          </View>
        );
      })}
      <View style={[styles.compactLabel, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.compactLabelText}>
          {status === 'approved' ? '✓' : status === 'rejected' ? '✕' : `${currentLevel}/${maxLevel}`}
        </Text>
      </View>
    </View>
  );
}

export function ActiveTierIndicator({
  tier,
  showPulse = true,
  size = 'medium',
}: {
  tier: TierProgressItem;
  showPulse?: boolean;
  size?: 'small' | 'medium' | 'large';
}) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (showPulse && tier.status === 'current') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      glowAnimation.start();

      return () => {
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [showPulse, tier.status, pulseAnim, glowAnim]);

  const tierColor = tier.color || tierLevelColors[tier.level];
  const isCurrent = tier.status === 'current';

  const sizeConfig = {
    small: { indicator: 32, icon: 14, badge: 8, font: 10 },
    medium: { indicator: 48, icon: 20, badge: 10, font: 12 },
    large: { indicator: 64, icon: 28, badge: 12, font: 14 },
  }[size];

  const getStatusIcon = () => {
    switch (tier.status) {
      case 'approved':
        return <CheckCircle2 size={sizeConfig.icon} color="#FFF" />;
      case 'rejected':
        return <XCircle size={sizeConfig.icon} color="#FFF" />;
      case 'returned':
        return <RefreshCw size={sizeConfig.icon} color="#FFF" />;
      case 'current':
        return tierLevelIcons[tier.level];
      case 'escalated':
        return <AlertTriangle size={sizeConfig.icon} color="#FFF" />;
      case 'skipped':
        return <ArrowRight size={sizeConfig.icon} color="#FFF" />;
      default:
        return <Clock size={sizeConfig.icon} color={colors.textTertiary} />;
    }
  };

  const getStatusColor = () => {
    switch (tier.status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      case 'current': return tierColor;
      case 'escalated': return '#F59E0B';
      case 'skipped': return '#6B7280';
      default: return colors.border;
    }
  };

  return (
    <View style={styles.activeTierContainer}>
      <View style={styles.activeTierIndicatorWrapper}>
        {isCurrent && showPulse && (
          <Animated.View
            style={[
              styles.activeTierGlow,
              {
                width: sizeConfig.indicator + 16,
                height: sizeConfig.indicator + 16,
                borderRadius: (sizeConfig.indicator + 16) / 2,
                backgroundColor: tierColor,
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.activeTierIndicator,
            {
              width: sizeConfig.indicator,
              height: sizeConfig.indicator,
              borderRadius: sizeConfig.indicator / 2,
              backgroundColor: getStatusColor(),
              borderWidth: tier.status === 'pending' ? 2 : 0,
              borderColor: colors.border,
              transform: isCurrent && showPulse ? [{ scale: pulseAnim }] : [],
            },
          ]}
        >
          {getStatusIcon()}
        </Animated.View>
      </View>
      <View style={styles.activeTierInfo}>
        <View style={styles.activeTierLabelRow}>
          <View style={[styles.activeTierLevelBadge, { backgroundColor: tierColor }]}>
            <Text style={[styles.activeTierLevelText, { fontSize: sizeConfig.badge }]}>T{tier.level}</Text>
          </View>
          <TierStatusBadge status={tier.status} size={size === 'large' ? 'medium' : 'small'} />
        </View>
        <Text style={[styles.activeTierName, { color: colors.text, fontSize: sizeConfig.font + 2 }]} numberOfLines={1}>
          {tier.name}
        </Text>
        {tier.status === 'current' && tier.requiredApprovals > 0 && (
          <Text style={[styles.activeTierProgress, { color: colors.textSecondary, fontSize: sizeConfig.font }]}>
            {tier.completedApprovals}/{tier.requiredApprovals} approvals
          </Text>
        )}
      </View>
    </View>
  );
}

export function ProgressStepIndicator({
  currentStep,
  totalSteps,
  variant = 'default',
  size = 'medium',
  showPercentage = false,
  status = 'in_progress',
}: {
  currentStep: number;
  totalSteps: number;
  variant?: 'default' | 'badge' | 'detailed' | 'minimal' | 'circular';
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  status?: 'in_progress' | 'approved' | 'rejected' | 'returned';
}) {
  const { colors } = useTheme();
  const completedPercent = totalSteps > 0 ? Math.round(((currentStep - 1) / totalSteps) * 100) : 0;

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      default: return tierLevelColors[currentStep as ApprovalTierLevel] || '#3B82F6';
    }
  };

  const statusColor = getStatusColor();

  const sizeConfig = {
    small: { text: 11, icon: 12, padding: 6, gap: 4 },
    medium: { text: 13, icon: 14, padding: 10, gap: 6 },
    large: { text: 15, icon: 18, padding: 14, gap: 8 },
  }[size];

  if (variant === 'minimal') {
    return (
      <View style={stepIndicatorStyles.minimalContainer}>
        <Text style={[
          stepIndicatorStyles.minimalText,
          { color: statusColor, fontSize: sizeConfig.text }
        ]}>
          {currentStep}/{totalSteps}
        </Text>
      </View>
    );
  }

  if (variant === 'badge') {
    return (
      <View style={[
        stepIndicatorStyles.badgeContainer,
        {
          backgroundColor: `${statusColor}15`,
          paddingHorizontal: sizeConfig.padding,
          paddingVertical: sizeConfig.padding / 2,
        }
      ]}>
        <TrendingUp size={sizeConfig.icon} color={statusColor} />
        <Text style={[
          stepIndicatorStyles.badgeText,
          { color: statusColor, fontSize: sizeConfig.text }
        ]}>
          Step {currentStep} of {totalSteps}
        </Text>
        {showPercentage && (
          <View style={[stepIndicatorStyles.percentBadge, { backgroundColor: statusColor }]}>
            <Text style={[stepIndicatorStyles.percentText, { fontSize: sizeConfig.text - 2 }]}>
              {completedPercent}%
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (variant === 'circular') {
    const circleSize = size === 'small' ? 48 : size === 'medium' ? 64 : 80;
    const strokeWidth = size === 'small' ? 4 : size === 'medium' ? 5 : 6;

    return (
      <View style={[stepIndicatorStyles.circularContainer, { width: circleSize, height: circleSize }]}>
        <View style={StyleSheet.absoluteFill}>
          <View style={[
            stepIndicatorStyles.circularTrack,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth: strokeWidth,
              borderColor: colors.border,
            }
          ]} />
          <View style={[
            stepIndicatorStyles.circularProgress,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth: strokeWidth,
              borderColor: statusColor,
              borderTopColor: completedPercent >= 25 ? statusColor : 'transparent',
              borderRightColor: completedPercent >= 50 ? statusColor : 'transparent',
              borderBottomColor: completedPercent >= 75 ? statusColor : 'transparent',
              borderLeftColor: completedPercent >= 100 ? statusColor : 'transparent',
              transform: [{ rotate: '-90deg' }],
            }
          ]} />
        </View>
        <View style={stepIndicatorStyles.circularContent}>
          <Text style={[
            stepIndicatorStyles.circularStep,
            { color: statusColor, fontSize: sizeConfig.text + 4 }
          ]}>
            {currentStep}
          </Text>
          <Text style={[
            stepIndicatorStyles.circularTotal,
            { color: colors.textTertiary, fontSize: sizeConfig.text - 2 }
          ]}>
            of {totalSteps}
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'detailed') {
    return (
      <View style={[
        stepIndicatorStyles.detailedContainer,
        { backgroundColor: colors.surface, borderColor: colors.border }
      ]}>
        <View style={stepIndicatorStyles.detailedHeader}>
          <View style={stepIndicatorStyles.detailedLeft}>
            <View style={[stepIndicatorStyles.detailedIconBg, { backgroundColor: `${statusColor}15` }]}>
              <TrendingUp size={sizeConfig.icon + 2} color={statusColor} />
            </View>
            <View style={stepIndicatorStyles.detailedInfo}>
              <Text style={[stepIndicatorStyles.detailedLabel, { color: colors.textSecondary, fontSize: sizeConfig.text - 2 }]}>
                Approval Progress
              </Text>
              <Text style={[stepIndicatorStyles.detailedValue, { color: colors.text, fontSize: sizeConfig.text + 2 }]}>
                Step {currentStep} of {totalSteps}
              </Text>
            </View>
          </View>
          <View style={[stepIndicatorStyles.detailedBadge, { backgroundColor: statusColor }]}>
            <Text style={[stepIndicatorStyles.detailedBadgeText, { fontSize: sizeConfig.text }]}>
              {completedPercent}%
            </Text>
          </View>
        </View>
        <View style={stepIndicatorStyles.detailedProgressContainer}>
          <View style={[stepIndicatorStyles.detailedTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                stepIndicatorStyles.detailedFill,
                { backgroundColor: statusColor, width: `${completedPercent}%` }
              ]} 
            />
          </View>
          <View style={stepIndicatorStyles.detailedSteps}>
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNum = index + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              const stepColor = tierLevelColors[stepNum as ApprovalTierLevel] || colors.border;

              return (
                <View 
                  key={stepNum}
                  style={[
                    stepIndicatorStyles.detailedStepDot,
                    {
                      backgroundColor: isCompleted || isCurrent ? stepColor : colors.border,
                      opacity: isCompleted ? 1 : isCurrent ? 1 : 0.4,
                    }
                  ]}
                >
                  {isCompleted && <CheckCircle2 size={10} color="#FFF" />}
                  {isCurrent && <Zap size={10} color="#FFF" />}
                  {!isCompleted && !isCurrent && (
                    <Text style={stepIndicatorStyles.detailedStepNum}>{stepNum}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // Default variant
  return (
    <View style={[
      stepIndicatorStyles.defaultContainer,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        padding: sizeConfig.padding,
        gap: sizeConfig.gap,
      }
    ]}>
      <View style={stepIndicatorStyles.defaultHeader}>
        <Text style={[stepIndicatorStyles.defaultLabel, { color: colors.textSecondary, fontSize: sizeConfig.text - 1 }]}>
          Progress
        </Text>
        <Text style={[stepIndicatorStyles.defaultValue, { color: statusColor, fontSize: sizeConfig.text }]}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>
      <View style={stepIndicatorStyles.defaultStepsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const stepColor = tierLevelColors[stepNum as ApprovalTierLevel] || colors.border;

          return (
            <View key={stepNum} style={stepIndicatorStyles.defaultStepItem}>
              <View 
                style={[
                  stepIndicatorStyles.defaultStepDot,
                  size === 'small' && stepIndicatorStyles.defaultStepDotSmall,
                  size === 'large' && stepIndicatorStyles.defaultStepDotLarge,
                  {
                    backgroundColor: isCompleted || isCurrent ? stepColor : colors.border,
                    borderWidth: isCurrent ? 3 : 0,
                    borderColor: `${stepColor}40`,
                  }
                ]}
              >
                {isCompleted && <CheckCircle2 size={size === 'small' ? 10 : size === 'large' ? 14 : 12} color="#FFF" />}
                {isCurrent && <Zap size={size === 'small' ? 10 : size === 'large' ? 14 : 12} color="#FFF" />}
              </View>
              {index < totalSteps - 1 && (
                <View 
                  style={[
                    stepIndicatorStyles.defaultConnector,
                    size === 'small' && stepIndicatorStyles.defaultConnectorSmall,
                    size === 'large' && stepIndicatorStyles.defaultConnectorLarge,
                    { backgroundColor: isCompleted ? stepColor : colors.border }
                  ]} 
                />
              )}
            </View>
          );
        })}
      </View>
      {showPercentage && (
        <View style={stepIndicatorStyles.defaultFooter}>
          <View style={[stepIndicatorStyles.defaultProgressTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                stepIndicatorStyles.defaultProgressFill,
                { backgroundColor: statusColor, width: `${completedPercent}%` }
              ]} 
            />
          </View>
          <Text style={[stepIndicatorStyles.defaultPercentText, { color: statusColor, fontSize: sizeConfig.text - 1 }]}>
            {completedPercent}%
          </Text>
        </View>
      )}
    </View>
  );
}

const stepIndicatorStyles = StyleSheet.create({
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimalText: {
    fontWeight: '700' as const,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: '600' as const,
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  percentText: {
    color: '#FFF',
    fontWeight: '700' as const,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTrack: {
    position: 'absolute',
  },
  circularProgress: {
    position: 'absolute',
  },
  circularContent: {
    alignItems: 'center',
  },
  circularStep: {
    fontWeight: '700' as const,
  },
  circularTotal: {
    fontWeight: '500' as const,
    marginTop: -2,
  },
  detailedContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedInfo: {
    gap: 2,
  },
  detailedLabel: {
    fontWeight: '500' as const,
  },
  detailedValue: {
    fontWeight: '700' as const,
  },
  detailedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailedBadgeText: {
    color: '#FFF',
    fontWeight: '700' as const,
  },
  detailedProgressContainer: {
    gap: 10,
  },
  detailedTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  detailedFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailedSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailedStepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedStepNum: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  defaultContainer: {
    borderRadius: 10,
    borderWidth: 1,
  },
  defaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaultLabel: {
    fontWeight: '500' as const,
  },
  defaultValue: {
    fontWeight: '700' as const,
  },
  defaultStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  defaultStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultStepDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  defaultStepDotLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  defaultConnector: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  defaultConnectorSmall: {
    width: 16,
    height: 2,
  },
  defaultConnectorLarge: {
    width: 32,
    height: 4,
  },
  defaultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  defaultProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  defaultProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  defaultPercentText: {
    fontWeight: '600' as const,
    minWidth: 32,
    textAlign: 'right' as const,
  },
});

export function TierStatusBadge({
  status,
  size = 'small',
  showIcon = true,
}: {
  status: TierStatus;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return { bg: '#10B98120', color: '#10B981', label: 'Approved', icon: <CheckCircle2 size={size === 'small' ? 10 : 12} color="#10B981" /> };
      case 'rejected':
        return { bg: '#EF444420', color: '#EF4444', label: 'Rejected', icon: <XCircle size={size === 'small' ? 10 : 12} color="#EF4444" /> };
      case 'returned':
        return { bg: '#F59E0B20', color: '#F59E0B', label: 'Returned', icon: <RefreshCw size={size === 'small' ? 10 : 12} color="#F59E0B" /> };
      case 'current':
        return { bg: '#3B82F620', color: '#3B82F6', label: 'Active', icon: <Zap size={size === 'small' ? 10 : 12} color="#3B82F6" /> };
      case 'escalated':
        return { bg: '#F59E0B20', color: '#F59E0B', label: 'Escalated', icon: <AlertTriangle size={size === 'small' ? 10 : 12} color="#F59E0B" /> };
      case 'skipped':
        return { bg: '#6B728020', color: '#6B7280', label: 'Skipped', icon: <ArrowRight size={size === 'small' ? 10 : 12} color="#6B7280" /> };
      default:
        return { bg: '#9CA3AF20', color: '#9CA3AF', label: 'Pending', icon: <Clock size={size === 'small' ? 10 : 12} color="#9CA3AF" /> };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[
      styles.tierStatusBadge,
      size === 'medium' && styles.tierStatusBadgeMedium,
      { backgroundColor: config.bg },
    ]}>
      {showIcon && config.icon}
      <Text style={[
        styles.tierStatusBadgeText,
        size === 'medium' && styles.tierStatusBadgeTextMedium,
        { color: config.color },
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

export function VerticalTierTimeline({
  tiers,
  currentTierLevel,
  onTierPress,
  showConnectors = true,
  animateActive = true,
}: {
  tiers: TierProgressItem[];
  currentTierLevel: ApprovalTierLevel;
  onTierPress?: (tier: TierProgressItem) => void;
  showConnectors?: boolean;
  animateActive?: boolean;
}) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const sortedTiers = useMemo(() => 
    [...tiers].sort((a, b) => a.level - b.level),
  [tiers]);

  useEffect(() => {
    if (animateActive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animateActive, pulseAnim]);

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

  const getStatusIcon = (status: TierStatus, level: ApprovalTierLevel) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={16} color="#FFF" />;
      case 'rejected':
        return <XCircle size={16} color="#FFF" />;
      case 'returned':
        return <RefreshCw size={16} color="#FFF" />;
      case 'current':
        return <Zap size={16} color="#FFF" />;
      case 'escalated':
        return <AlertTriangle size={16} color="#FFF" />;
      case 'skipped':
        return <ArrowRight size={16} color="#FFF" />;
      default:
        return <Clock size={16} color={colors.textTertiary} />;
    }
  };

  const getStatusColor = (status: TierStatus, level: ApprovalTierLevel) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      case 'current': return tierLevelColors[level];
      case 'escalated': return '#F59E0B';
      case 'skipped': return '#6B7280';
      default: return colors.border;
    }
  };

  return (
    <View style={styles.verticalTimelineContainer}>
      {sortedTiers.map((tier, index) => {
        const isLast = index === sortedTiers.length - 1;
        const isCurrent = tier.status === 'current';
        const statusColor = getStatusColor(tier.status, tier.level);
        const tierColor = tier.color || tierLevelColors[tier.level];
        const lineColor = tier.status === 'approved' || tier.status === 'skipped' 
          ? '#10B981' 
          : colors.border;

        return (
          <View key={tier.id} style={styles.verticalTimelineRow}>
            <View style={styles.verticalTimelineLeft}>
              {isCurrent && animateActive ? (
                <View style={styles.verticalTimelineIndicatorWrapper}>
                  <Animated.View
                    style={[
                      styles.verticalTimelinePulse,
                      {
                        backgroundColor: `${tierColor}30`,
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.verticalTimelineIndicator,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    {getStatusIcon(tier.status, tier.level)}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.verticalTimelineIndicator,
                    { 
                      backgroundColor: statusColor,
                      borderWidth: tier.status === 'pending' ? 2 : 0,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {getStatusIcon(tier.status, tier.level)}
                </View>
              )}
              {!isLast && showConnectors && (
                <View style={[styles.verticalTimelineLine, { backgroundColor: lineColor }]} />
              )}
            </View>

            <Pressable
              style={[
                styles.verticalTimelineContent,
                {
                  backgroundColor: isCurrent ? `${tierColor}10` : colors.surface,
                  borderColor: isCurrent ? tierColor : colors.border,
                },
              ]}
              onPress={() => onTierPress?.(tier)}
              disabled={!onTierPress}
            >
              <View style={styles.verticalTimelineHeader}>
                <View style={[styles.verticalTimelineTierBadge, { backgroundColor: tierColor }]}>
                  <Text style={styles.verticalTimelineTierText}>Tier {tier.level}</Text>
                </View>
                <TierStatusBadge status={tier.status} size="small" />
              </View>
              <Text style={[styles.verticalTimelineName, { color: colors.text }]} numberOfLines={1}>
                {tier.name}
              </Text>
              {tier.description && (
                <Text style={[styles.verticalTimelineDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {tier.description}
                </Text>
              )}
              {isCurrent && tier.requiredApprovals > 0 && (
                <View style={styles.verticalTimelineProgress}>
                  <View style={[styles.verticalTimelineProgressTrack, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.verticalTimelineProgressFill,
                        { 
                          backgroundColor: tierColor,
                          width: `${(tier.completedApprovals / tier.requiredApprovals) * 100}%`,
                        },
                      ]} 
                    />
                  </View>
                  <Text style={[styles.verticalTimelineProgressText, { color: tierColor }]}>
                    {tier.completedApprovals}/{tier.requiredApprovals}
                  </Text>
                </View>
              )}
              {(tier.startedAt || tier.completedAt) && (
                <Text style={[styles.verticalTimelineTime, { color: colors.textTertiary }]}>
                  {tier.completedAt ? `Completed ${formatTimeAgo(tier.completedAt)}` : 
                   tier.startedAt ? `Started ${formatTimeAgo(tier.startedAt)}` : ''}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  activeTierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeTierIndicatorWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTierGlow: {
    position: 'absolute',
  },
  activeTierIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTierInfo: {
    flex: 1,
    gap: 4,
  },
  activeTierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTierLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTierLevelText: {
    color: '#FFF',
    fontWeight: '700' as const,
  },
  activeTierName: {
    fontWeight: '600' as const,
  },
  activeTierProgress: {
    marginTop: 2,
  },
  tierStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierStatusBadgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierStatusBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  tierStatusBadgeTextMedium: {
    fontSize: 12,
  },
  verticalTimelineContainer: {
    gap: 0,
  },
  verticalTimelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verticalTimelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  verticalTimelineIndicatorWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalTimelinePulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  verticalTimelineIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  verticalTimelineLine: {
    width: 3,
    flex: 1,
    minHeight: 16,
    borderRadius: 1.5,
  },
  verticalTimelineContent: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  verticalTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verticalTimelineTierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verticalTimelineTierText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  verticalTimelineName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  verticalTimelineDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  verticalTimelineProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  verticalTimelineProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  verticalTimelineProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  verticalTimelineProgressText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  verticalTimelineTime: {
    fontSize: 10,
    marginTop: 2,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 12,
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 44,
  },
  tierIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierIndicatorCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  tierLine: {
    width: 3,
    flex: 1,
    minHeight: 20,
    borderRadius: 1.5,
  },
  tierCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tierCardCompact: {
    marginBottom: 8,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
  },
  tierHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  tierLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierLevelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tierDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  thresholdBadge: {
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  thresholdText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  progressSection: {
    marginHorizontal: 14,
    marginBottom: 12,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  escalationAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  escalationText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  returnedAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  returnedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  approversSection: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  approversLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  approverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  approverItemLast: {
    borderBottomWidth: 0,
  },
  approverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  approverAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approverInfo: {
    flex: 1,
    gap: 2,
  },
  approverName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  approverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approverRole: {
    fontSize: 11,
  },
  requiredBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  requiredText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '600' as const,
  },
  approverRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approverTime: {
    fontSize: 10,
  },
  timestampSection: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  timestampItem: {
    flexDirection: 'row',
    gap: 6,
  },
  timestampLabel: {
    fontSize: 11,
  },
  timestampValue: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  summaryContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLeft: {
    gap: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  summarySubtitle: {
    fontSize: 12,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  summaryBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  summaryTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryDotText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  summaryConnector: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
  },
  summaryLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  summaryLegendText: {
    fontSize: 11,
    textAlign: 'center' as const,
    flex: 1,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactConnector: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  compactLabel: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactLabelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
});

export default TierProgressVisualization;
