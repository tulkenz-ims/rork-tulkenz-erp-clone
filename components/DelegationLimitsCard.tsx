import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DollarSign,
  Clock,
  Shield,
  AlertTriangle,
  Bell,
  Users,
  Ban,
  FileText,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { DelegationLimits, WorkflowCategory, ApprovalTierLevel } from '@/types/approvalWorkflows';
import { tierLevelColors } from '@/types/approvalWorkflows';

const categoryLabels: Record<WorkflowCategory, string> = {
  purchase: 'Purchase Orders',
  time_off: 'Time Off',
  permit: 'Permits',
  expense: 'Expenses',
  contract: 'Contracts',
  custom: 'Custom',
};

interface DelegationLimitsCardProps {
  limits?: DelegationLimits | null;
  showTitle?: boolean;
  compact?: boolean;
}

export default function DelegationLimitsCard({
  limits,
  showTitle = true,
  compact = false,
}: DelegationLimitsCardProps) {
  const { colors } = useTheme();

  if (!limits || Object.keys(limits).length === 0) {
    return null;
  }

  const hasLimits = 
    limits.maxApprovalAmount !== undefined ||
    limits.maxApprovalsPerDay !== undefined ||
    limits.maxTierLevel !== undefined ||
    limits.requireJustificationAbove !== undefined ||
    (limits.excludeCategories && limits.excludeCategories.length > 0) ||
    limits.excludeHighPriority ||
    limits.allowReDelegation === false ||
    limits.restrictToSameDepartment;

  if (!hasLimits) {
    return null;
  }

  const renderLimitItem = (
    icon: React.ReactNode,
    label: string,
    value: string | React.ReactNode,
    color?: string,
    isWarning?: boolean
  ) => (
    <View style={[styles.limitItem, compact && styles.limitItemCompact]}>
      <View style={[
        styles.limitIcon, 
        { backgroundColor: (isWarning ? '#EF4444' : color || colors.primary) + '15' },
        compact && styles.limitIconCompact,
      ]}>
        {icon}
      </View>
      <View style={styles.limitContent}>
        <Text style={[styles.limitLabel, { color: colors.textSecondary }, compact && styles.limitLabelCompact]}>
          {label}
        </Text>
        {typeof value === 'string' ? (
          <Text style={[
            styles.limitValue, 
            { color: isWarning ? '#EF4444' : colors.text },
            compact && styles.limitValueCompact
          ]}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  const renderTierBadge = (level: ApprovalTierLevel) => (
    <View style={[styles.tierBadge, { backgroundColor: tierLevelColors[level] + '20' }]}>
      <Text style={[styles.tierBadgeText, { color: tierLevelColors[level] }]}>
        Tier {level}
      </Text>
    </View>
  );

  const renderExcludedCategories = (categories: WorkflowCategory[]) => (
    <View style={styles.categoriesContainer}>
      {categories.map(cat => (
        <View key={cat} style={[styles.categoryBadge, { backgroundColor: '#EF4444' + '15' }]}>
          <Text style={[styles.categoryBadgeText, { color: '#EF4444' }]}>
            {categoryLabels[cat]}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, compact && styles.containerCompact]}>
      {showTitle && (
        <View style={styles.header}>
          <Shield size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Limits & Restrictions</Text>
        </View>
      )}

      <View style={[styles.limitsGrid, compact && styles.limitsGridCompact]}>
        {limits.maxApprovalAmount !== undefined && renderLimitItem(
          <DollarSign size={compact ? 14 : 16} color={colors.primary} />,
          'Max Amount',
          `$${limits.maxApprovalAmount.toLocaleString()}`
        )}

        {limits.requireJustificationAbove !== undefined && renderLimitItem(
          <FileText size={compact ? 14 : 16} color="#F59E0B" />,
          'Justification Required',
          `Above $${limits.requireJustificationAbove.toLocaleString()}`,
          '#F59E0B'
        )}

        {limits.maxApprovalsPerDay !== undefined && renderLimitItem(
          <Clock size={compact ? 14 : 16} color={colors.primary} />,
          'Daily Limit',
          `${limits.maxApprovalsPerDay} approvals/day`
        )}

        {limits.maxTierLevel !== undefined && renderLimitItem(
          <Shield size={compact ? 14 : 16} color={tierLevelColors[limits.maxTierLevel]} />,
          'Max Tier Level',
          renderTierBadge(limits.maxTierLevel),
          tierLevelColors[limits.maxTierLevel]
        )}

        {limits.excludeHighPriority && renderLimitItem(
          <AlertTriangle size={compact ? 14 : 16} color="#F59E0B" />,
          'High Priority',
          'Excluded',
          '#F59E0B'
        )}

        {limits.allowReDelegation === false && renderLimitItem(
          <Ban size={compact ? 14 : 16} color="#EF4444" />,
          'Re-delegation',
          'Not Allowed',
          '#EF4444',
          true
        )}

        {limits.restrictToSameDepartment && renderLimitItem(
          <Building2 size={compact ? 14 : 16} color={colors.primary} />,
          'Department',
          'Same dept. only'
        )}

        {limits.requireNotification && renderLimitItem(
          <Bell size={compact ? 14 : 16} color={colors.primary} />,
          'Notifications',
          'Enabled'
        )}
      </View>

      {limits.excludeCategories && limits.excludeCategories.length > 0 && (
        <View style={styles.excludedSection}>
          <View style={styles.excludedHeader}>
            <Users size={14} color="#EF4444" />
            <Text style={[styles.excludedLabel, { color: colors.textSecondary }]}>
              Excluded Categories
            </Text>
          </View>
          {renderExcludedCategories(limits.excludeCategories)}
        </View>
      )}
    </View>
  );
}

interface DelegationLimitsSummaryProps {
  limits?: DelegationLimits | null;
}

export function DelegationLimitsSummary({ limits }: DelegationLimitsSummaryProps) {
  const { colors } = useTheme();

  if (!limits) return null;

  const items: string[] = [];

  if (limits.maxApprovalAmount) {
    items.push(`Max $${limits.maxApprovalAmount.toLocaleString()}`);
  }
  if (limits.maxTierLevel) {
    items.push(`Tier ≤${limits.maxTierLevel}`);
  }
  if (limits.allowReDelegation === false) {
    items.push('No re-delegation');
  }
  if (limits.excludeHighPriority) {
    items.push('Excl. high priority');
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.summaryContainer}>
      {items.map((item, index) => (
        <View 
          key={index} 
          style={[
            styles.summaryBadge, 
            { 
              backgroundColor: item.includes('No re-delegation') ? '#EF4444' + '15' : colors.primary + '15',
            }
          ]}
        >
          <Text 
            style={[
              styles.summaryBadgeText, 
              { color: item.includes('No re-delegation') ? '#EF4444' : colors.primary }
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface DelegationRestrictionsIndicatorProps {
  limits?: DelegationLimits | null;
  size?: 'small' | 'medium';
}

export function DelegationRestrictionsIndicator({ 
  limits, 
  size = 'medium' 
}: DelegationRestrictionsIndicatorProps) {
  const { colors } = useTheme();

  if (!limits) return null;

  const restrictionCount = [
    limits.maxApprovalAmount !== undefined,
    limits.maxApprovalsPerDay !== undefined,
    limits.maxTierLevel !== undefined,
    limits.excludeHighPriority,
    limits.allowReDelegation === false,
    limits.excludeCategories && limits.excludeCategories.length > 0,
    limits.requireJustificationAbove !== undefined,
  ].filter(Boolean).length;

  if (restrictionCount === 0) return null;

  const hasStrictRestrictions = 
    limits.allowReDelegation === false || 
    limits.maxTierLevel !== undefined ||
    (limits.excludeCategories && limits.excludeCategories.length > 0);

  const iconSize = size === 'small' ? 12 : 14;
  const containerStyle = size === 'small' ? styles.indicatorSmall : styles.indicatorMedium;

  return (
    <View 
      style={[
        styles.indicator, 
        containerStyle,
        { 
          backgroundColor: hasStrictRestrictions ? '#EF4444' + '15' : colors.primary + '15',
          borderColor: hasStrictRestrictions ? '#EF4444' + '30' : colors.primary + '30',
        }
      ]}
    >
      <Shield size={iconSize} color={hasStrictRestrictions ? '#EF4444' : colors.primary} />
      <Text 
        style={[
          styles.indicatorText, 
          { color: hasStrictRestrictions ? '#EF4444' : colors.primary },
          size === 'small' && styles.indicatorTextSmall,
        ]}
      >
        {restrictionCount} {restrictionCount === 1 ? 'limit' : 'limits'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  containerCompact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  limitsGrid: {
    gap: 12,
  },
  limitsGridCompact: {
    gap: 8,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitItemCompact: {
    gap: 8,
  },
  limitIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitIconCompact: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  limitContent: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  limitLabelCompact: {
    fontSize: 11,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  limitValueCompact: {
    fontSize: 13,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  excludedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  excludedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  excludedLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  indicatorSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  indicatorMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  indicatorTextSmall: {
    fontSize: 10,
  },
});
