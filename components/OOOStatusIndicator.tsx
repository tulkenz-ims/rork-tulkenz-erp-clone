import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Plane,
  Clock,
  Calendar,
  UserCheck,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { DelegationRule } from '@/types/approvalWorkflows';

interface OOOStatusIndicatorProps {
  delegation: DelegationRule;
  variant?: 'badge' | 'card' | 'inline';
  showDates?: boolean;
  showDelegate?: boolean;
  onPress?: () => void;
}

export default function OOOStatusIndicator({
  delegation,
  variant = 'badge',
  showDates = true,
  showDelegate = true,
  onPress,
}: OOOStatusIndicatorProps) {
  const { colors } = useTheme();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = () => {
    const end = new Date(delegation.endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReasonIcon = () => {
    const reason = delegation.reason?.toLowerCase() || '';
    if (reason.includes('vacation') || reason.includes('holiday') || reason.includes('travel')) {
      return Plane;
    }
    return Clock;
  };

  const ReasonIcon = getReasonIcon();
  const daysRemaining = getDaysRemaining();

  if (variant === 'badge') {
    return (
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: '#F59E0B' + '20' }]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <ReasonIcon size={12} color="#F59E0B" />
        <Text style={[styles.badgeText, { color: '#F59E0B' }]}>OOO</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        <View style={[styles.inlineBadge, { backgroundColor: '#F59E0B' + '15' }]}>
          <ReasonIcon size={14} color="#F59E0B" />
          <Text style={[styles.inlineText, { color: '#F59E0B' }]}>
            Out of Office
          </Text>
        </View>
        {showDates && (
          <Text style={[styles.inlineDates, { color: colors.textSecondary }]}>
            until {formatDate(delegation.endDate)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '30' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: '#F59E0B' + '20' }]}>
          <ReasonIcon size={20} color="#F59E0B" />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Out of Office</Text>
          {delegation.reason && (
            <Text style={[styles.cardReason, { color: colors.textSecondary }]} numberOfLines={1}>
              {delegation.reason}
            </Text>
          )}
        </View>
        {daysRemaining > 0 && (
          <View style={[styles.daysRemainingBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.daysRemainingText, { color: '#F59E0B' }]}>
              {daysRemaining}d left
            </Text>
          </View>
        )}
      </View>

      {showDates && (
        <View style={styles.cardDates}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.cardDatesText, { color: colors.textSecondary }]}>
            {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
          </Text>
        </View>
      )}

      {showDelegate && (
        <View style={styles.cardDelegate}>
          <Text style={[styles.cardDelegateLabel, { color: colors.textSecondary }]}>
            Delegated to:
          </Text>
          <View style={styles.delegateRow}>
            <View style={[styles.delegateAvatar, { backgroundColor: '#10B981' + '20' }]}>
              <UserCheck size={14} color="#10B981" />
            </View>
            <Text style={[styles.delegateName, { color: colors.text }]}>
              {delegation.toUserName}
            </Text>
            <ArrowRight size={14} color={colors.textSecondary} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface OOOStatusBadgeProps {
  isOOO: boolean;
  size?: 'small' | 'medium';
}

export function OOOStatusBadge({ isOOO, size = 'small' }: OOOStatusBadgeProps) {
  if (!isOOO) return null;

  const iconSize = size === 'small' ? 10 : 12;
  const fontSize = size === 'small' ? 9 : 11;

  return (
    <View style={[
      styles.statusBadge,
      { backgroundColor: '#F59E0B' + '20' },
      size === 'medium' && styles.statusBadgeMedium,
    ]}>
      <Plane size={iconSize} color="#F59E0B" />
      <Text style={[styles.statusBadgeText, { color: '#F59E0B', fontSize }]}>OOO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  inlineText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  inlineDates: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardReason: {
    fontSize: 12,
    marginTop: 2,
  },
  daysRemainingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  daysRemainingText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  cardDatesText: {
    fontSize: 13,
  },
  cardDelegate: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cardDelegateLabel: {
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  delegateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delegateAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delegateName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  statusBadgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusBadgeText: {
    fontWeight: '600' as const,
  },
});
