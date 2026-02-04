import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  XCircle,
  RotateCcw,
  AlertTriangle,
  ArrowLeftCircle,
  History,
  Clock,
  Ban,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ApprovalTierLevel, RejectionHistoryEntry, WorkflowInstanceStatus } from '@/types/approvalWorkflows';

interface StatusBadgeProps {
  status: WorkflowInstanceStatus | string;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { colors } = useTheme();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'rejected':
        return {
          icon: XCircle,
          color: '#EF4444',
          bgColor: '#EF444415',
          label: 'Rejected',
        };
      case 'returned':
        return {
          icon: ArrowLeftCircle,
          color: '#F59E0B',
          bgColor: '#F59E0B15',
          label: 'Returned',
        };
      case 'cancelled':
        return {
          icon: Ban,
          color: '#6B7280',
          bgColor: '#6B728015',
          label: 'Cancelled',
        };
      case 'escalated':
        return {
          icon: AlertTriangle,
          color: '#8B5CF6',
          bgColor: '#8B5CF615',
          label: 'Escalated',
        };
      case 'pending':
        return {
          icon: Clock,
          color: '#F59E0B',
          bgColor: '#F59E0B15',
          label: 'Pending',
        };
      case 'in_progress':
      case 'partially_approved':
        return {
          icon: Clock,
          color: '#3B82F6',
          bgColor: '#3B82F615',
          label: 'In Progress',
        };
      case 'approved':
        return {
          icon: null,
          color: '#10B981',
          bgColor: '#10B98115',
          label: 'Approved',
        };
      default:
        return {
          icon: null,
          color: colors.textSecondary,
          bgColor: colors.backgroundSecondary,
          label: status,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const paddingH = size === 'small' ? 6 : size === 'medium' ? 8 : 10;

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bgColor, paddingVertical: padding, paddingHorizontal: paddingH }]}>
      {Icon && <Icon size={iconSize} color={config.color} />}
      <Text style={[styles.statusBadgeText, { color: config.color, fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
}

interface RejectedBadgeProps {
  reason?: string;
  tierLevel?: ApprovalTierLevel | number;
  showReason?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function RejectedBadge({ reason, tierLevel, showReason = false, size = 'medium' }: RejectedBadgeProps) {
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const paddingH = size === 'small' ? 6 : size === 'medium' ? 8 : 10;

  return (
    <View style={styles.rejectedContainer}>
      <View style={[styles.rejectedBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
        <XCircle size={iconSize} color="#EF4444" />
        <Text style={[styles.rejectedText, { fontSize }]}>
          Rejected{tierLevel ? ` at Tier ${tierLevel}` : ''}
        </Text>
      </View>
      {showReason && reason && (
        <Text style={[styles.rejectedReason, { fontSize: fontSize - 1 }]} numberOfLines={2}>
          &ldquo;{reason}&rdquo;
        </Text>
      )}
    </View>
  );
}

interface ReturnedBadgeProps {
  returnedFromTier?: ApprovalTierLevel | number;
  returnedBy?: string;
  size?: 'small' | 'medium' | 'large';
}

export function ReturnedBadge({ returnedFromTier, returnedBy, size = 'medium' }: ReturnedBadgeProps) {
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const paddingH = size === 'small' ? 6 : size === 'medium' ? 8 : 10;

  return (
    <View style={[styles.returnedBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
      <ArrowLeftCircle size={iconSize} color="#F59E0B" />
      <Text style={[styles.returnedText, { fontSize }]}>
        Returned{returnedFromTier ? ` from Tier ${returnedFromTier}` : ''}
        {returnedBy ? ` by ${returnedBy}` : ''}
      </Text>
    </View>
  );
}

interface ActionRequiredBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export function ActionRequiredBadge({ size = 'medium' }: ActionRequiredBadgeProps) {
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const paddingH = size === 'small' ? 6 : size === 'medium' ? 8 : 10;

  return (
    <View style={[styles.actionRequiredBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
      <AlertTriangle size={iconSize} color="#DC2626" />
      <Text style={[styles.actionRequiredText, { fontSize }]}>
        Action Required
      </Text>
    </View>
  );
}

interface RejectionCountBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export function RejectionCountBadge({ count, size = 'medium' }: RejectionCountBadgeProps) {
  if (count <= 1) return null;

  const iconSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const fontSize = size === 'small' ? 9 : size === 'medium' ? 10 : 12;
  const padding = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
  const paddingH = size === 'small' ? 5 : size === 'medium' ? 6 : 8;

  return (
    <View style={[styles.rejectionCountBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
      <History size={iconSize} color="#DC2626" />
      <Text style={[styles.rejectionCountText, { fontSize }]}>
        {count}x rejected
      </Text>
    </View>
  );
}

interface ResubmittedBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export function ResubmittedBadge({ count, size = 'medium' }: ResubmittedBadgeProps) {
  if (count < 1) return null;

  const iconSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const fontSize = size === 'small' ? 9 : size === 'medium' ? 10 : 12;
  const padding = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
  const paddingH = size === 'small' ? 5 : size === 'medium' ? 6 : 8;

  return (
    <View style={[styles.resubmittedBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
      <RotateCcw size={iconSize} color="#3B82F6" />
      <Text style={[styles.resubmittedText, { fontSize }]}>
        Resubmitted{count > 1 ? ` ${count}x` : ''}
      </Text>
    </View>
  );
}

interface TierRejectionBadgeProps {
  tierLevel: ApprovalTierLevel | number;
  size?: 'small' | 'medium' | 'large';
}

export function TierRejectionBadge({ tierLevel, size = 'medium' }: TierRejectionBadgeProps) {
  const fontSize = size === 'small' ? 9 : size === 'medium' ? 10 : 12;
  const padding = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
  const paddingH = size === 'small' ? 5 : size === 'medium' ? 6 : 8;

  return (
    <View style={[styles.tierRejectionBadge, { paddingVertical: padding, paddingHorizontal: paddingH }]}>
      <Text style={[styles.tierRejectionText, { fontSize }]}>
        T{tierLevel}
      </Text>
    </View>
  );
}

interface RejectionHistoryBadgesProps {
  history: RejectionHistoryEntry[];
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
}

export function RejectionHistoryBadges({ history, maxDisplay = 3, size = 'small' }: RejectionHistoryBadgesProps) {
  const { colors } = useTheme();
  
  if (!history || history.length === 0) return null;

  const displayHistory = history.slice(0, maxDisplay);
  const remainingCount = history.length - maxDisplay;

  return (
    <View style={styles.historyBadgesContainer}>
      {displayHistory.map((entry, index) => (
        <TierRejectionBadge 
          key={entry.id || index} 
          tierLevel={entry.tierLevel} 
          size={size} 
        />
      ))}
      {remainingCount > 0 && (
        <View style={[styles.moreHistoryBadge, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.moreHistoryText, { color: colors.textSecondary }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

interface CombinedStatusBadgesProps {
  status: WorkflowInstanceStatus | string;
  rejectionReason?: string;
  returnedFromTier?: ApprovalTierLevel | number;
  returnedBy?: string;
  rejectionHistory?: RejectionHistoryEntry[];
  resubmitCount?: number;
  showActionRequired?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
}

export function CombinedStatusBadges({
  status,
  rejectionReason,
  returnedFromTier,
  returnedBy,
  rejectionHistory,
  resubmitCount = 0,
  showActionRequired = true,
  size = 'small',
  layout = 'horizontal',
}: CombinedStatusBadgesProps) {
  const isRejected = status === 'rejected';
  const isReturned = status === 'returned';
  const rejectionCount = rejectionHistory?.length || 0;

  if (!isRejected && !isReturned) {
    return null;
  }

  const containerStyle = layout === 'vertical' ? styles.badgesContainerVertical : styles.badgesContainerHorizontal;

  return (
    <View style={containerStyle}>
      {isRejected && (
        <RejectedBadge 
          reason={rejectionReason} 
          tierLevel={returnedFromTier} 
          size={size} 
        />
      )}
      
      {isReturned && (
        <>
          <ReturnedBadge 
            returnedFromTier={returnedFromTier} 
            returnedBy={returnedBy}
            size={size} 
          />
          {showActionRequired && <ActionRequiredBadge size={size} />}
        </>
      )}
      
      {rejectionCount > 1 && (
        <RejectionCountBadge count={rejectionCount} size={size} />
      )}
      
      {resubmitCount > 0 && (
        <ResubmittedBadge count={resubmitCount} size={size} />
      )}
    </View>
  );
}

interface CardStatusIndicatorProps {
  status: WorkflowInstanceStatus | string;
  position?: 'top-right' | 'top-left' | 'inline';
}

export function CardStatusIndicator({ status, position = 'top-right' }: CardStatusIndicatorProps) {
  const getIndicatorColor = () => {
    switch (status) {
      case 'rejected':
        return '#EF4444';
      case 'returned':
        return '#F59E0B';
      case 'cancelled':
        return '#6B7280';
      case 'escalated':
        return '#8B5CF6';
      case 'pending':
      case 'in_progress':
      case 'partially_approved':
        return '#3B82F6';
      case 'approved':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  if (position === 'inline') {
    return (
      <View style={[styles.inlineIndicator, { backgroundColor: getIndicatorColor() }]} />
    );
  }

  const positionStyle = position === 'top-left' ? styles.indicatorTopLeft : styles.indicatorTopRight;

  return (
    <View style={[styles.cardIndicator, positionStyle, { backgroundColor: getIndicatorColor() }]} />
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontWeight: '600' as const,
  },
  rejectedContainer: {
    gap: 4,
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444415',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  rejectedText: {
    color: '#EF4444',
    fontWeight: '600' as const,
  },
  rejectedReason: {
    color: '#6B7280',
    fontStyle: 'italic' as const,
    paddingLeft: 4,
  },
  returnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B15',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  returnedText: {
    color: '#F59E0B',
    fontWeight: '600' as const,
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC262615',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DC262640',
    alignSelf: 'flex-start',
  },
  actionRequiredText: {
    color: '#DC2626',
    fontWeight: '700' as const,
  },
  rejectionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  rejectionCountText: {
    color: '#DC2626',
    fontWeight: '600' as const,
  },
  resubmittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  resubmittedText: {
    color: '#3B82F6',
    fontWeight: '600' as const,
  },
  tierRejectionBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tierRejectionText: {
    color: '#DC2626',
    fontWeight: '700' as const,
  },
  historyBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  moreHistoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  moreHistoryText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  badgesContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badgesContainerVertical: {
    gap: 6,
  },
  cardIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
  },
  indicatorTopRight: {
    top: 8,
    right: 8,
  },
  indicatorTopLeft: {
    top: 8,
    left: 8,
  },
  inlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
