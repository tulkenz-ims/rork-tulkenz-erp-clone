import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  UserCheck,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronRight,
  Plane,
  Shield,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { DelegationRule } from '@/types/approvalWorkflows';

interface ActiveDelegationBannerProps {
  delegationsReceived: DelegationRule[];
  delegationsGiven: DelegationRule[];
  onPress?: () => void;
  onDismiss?: () => void;
  variant?: 'full' | 'compact' | 'minimal';
}

export default function ActiveDelegationBanner({
  delegationsReceived,
  delegationsGiven,
  onPress,
  onDismiss,
  variant = 'full',
}: ActiveDelegationBannerProps) {
  const { colors } = useTheme();

  const hasReceived = delegationsReceived.length > 0;
  const hasGiven = delegationsGiven.length > 0;

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const expiringDelegations = useMemo(() => {
    const all = [...delegationsReceived, ...delegationsGiven];
    return all.filter(d => {
      const days = getDaysRemaining(d.endDate);
      return days <= 3 && days > 0;
    });
  }, [delegationsReceived, delegationsGiven]);

  if (!hasReceived && !hasGiven) return null;

  if (variant === 'minimal') {
    return (
      <TouchableOpacity
        style={[styles.minimalBanner, { backgroundColor: '#3B82F6' + '15' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <UserCheck size={16} color="#3B82F6" />
        <Text style={[styles.minimalText, { color: '#3B82F6' }]}>
          {hasReceived ? `Acting as delegate for ${delegationsReceived.length} user(s)` : `Delegated to ${delegationsGiven.length} user(s)`}
        </Text>
        <ChevronRight size={16} color="#3B82F6" />
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.compactBanner, { backgroundColor: colors.surface }]}>
        {hasReceived && (
          <TouchableOpacity
            style={[styles.compactSection, { backgroundColor: '#10B981' + '10' }]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.compactIcon, { backgroundColor: '#10B981' + '20' }]}>
              <UserCheck size={16} color="#10B981" />
            </View>
            <View style={styles.compactContent}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>
                Receiving Delegations
              </Text>
              <Text style={[styles.compactSubtitle, { color: colors.textSecondary }]}>
                You can approve for {delegationsReceived.map(d => d.fromUserName).join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        
        {hasGiven && (
          <TouchableOpacity
            style={[styles.compactSection, { backgroundColor: '#F59E0B' + '10' }]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.compactIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Plane size={16} color="#F59E0B" />
            </View>
            <View style={styles.compactContent}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>
                Out of Office
              </Text>
              <Text style={[styles.compactSubtitle, { color: colors.textSecondary }]}>
                {delegationsGiven.map(d => d.toUserName).join(', ')} handling your approvals
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {hasReceived && (
        <TouchableOpacity
          style={[styles.section, { backgroundColor: '#10B981' + '08' }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
              <UserCheck size={20} color="#10B981" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                You Are Acting as Delegate
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                You can approve requests on behalf of others
              </Text>
            </View>
          </View>

          <View style={styles.delegationsList}>
            {delegationsReceived.map(delegation => {
              const daysLeft = getDaysRemaining(delegation.endDate);
              const isExpiring = daysLeft <= 3;
              
              return (
                <View
                  key={delegation.id}
                  style={[styles.delegationItem, { backgroundColor: colors.background }]}
                >
                  <View style={styles.delegationInfo}>
                    <View style={styles.userRow}>
                      <View style={[styles.userAvatar, { backgroundColor: '#3B82F6' + '20' }]}>
                        <Text style={[styles.avatarText, { color: '#3B82F6' }]}>
                          {delegation.fromUserName.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                          {delegation.fromUserName}
                        </Text>
                        <View style={styles.delegationMeta}>
                          <Shield size={10} color={colors.textSecondary} />
                          <Text style={[styles.delegationType, { color: colors.textSecondary }]}>
                            {delegation.delegationType === 'full' ? 'Full authority' : 'Limited'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.dateInfo}>
                      <View style={styles.dateRow}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                          Until {formatDate(delegation.endDate)}
                        </Text>
                      </View>
                      {isExpiring && (
                        <View style={[styles.expiringBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                          <AlertTriangle size={10} color="#F59E0B" />
                          <Text style={[styles.expiringText, { color: '#F59E0B' }]}>
                            {daysLeft}d left
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      )}

      {hasGiven && (
        <TouchableOpacity
          style={[
            styles.section,
            { backgroundColor: '#F59E0B' + '08' },
            hasReceived && styles.sectionSpacing,
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
              <Plane size={20} color="#F59E0B" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                You Are Out of Office
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Your approvals are being handled by delegates
              </Text>
            </View>
          </View>

          <View style={styles.delegationsList}>
            {delegationsGiven.map(delegation => {
              const daysLeft = getDaysRemaining(delegation.endDate);
              const isExpiring = daysLeft <= 3;
              
              return (
                <View
                  key={delegation.id}
                  style={[styles.delegationItem, { backgroundColor: colors.background }]}
                >
                  <View style={styles.delegationInfo}>
                    <View style={styles.userRow}>
                      <Text style={[styles.delegatingTo, { color: colors.textSecondary }]}>
                        Delegated to
                      </Text>
                      <ArrowRight size={12} color={colors.textSecondary} />
                      <View style={[styles.userAvatar, { backgroundColor: '#10B981' + '20' }]}>
                        <Text style={[styles.avatarText, { color: '#10B981' }]}>
                          {delegation.toUserName.charAt(0)}
                        </Text>
                      </View>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {delegation.toUserName}
                      </Text>
                    </View>
                    
                    <View style={styles.dateInfo}>
                      <View style={styles.dateRow}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                          {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                        </Text>
                      </View>
                      {isExpiring && (
                        <View style={[styles.expiringBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                          <AlertTriangle size={10} color="#F59E0B" />
                          <Text style={[styles.expiringText, { color: '#F59E0B' }]}>
                            {daysLeft}d left
                          </Text>
                        </View>
                      )}
                    </View>

                    {delegation.reason && (
                      <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {delegation.reason}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      )}

      {expiringDelegations.length > 0 && (
        <View style={[styles.warningBar, { backgroundColor: '#F59E0B' + '15' }]}>
          <AlertTriangle size={14} color="#F59E0B" />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>
            {expiringDelegations.length} delegation{expiringDelegations.length > 1 ? 's' : ''} expiring soon
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  section: {
    padding: 16,
  },
  sectionSpacing: {
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  delegationsList: {
    gap: 8,
  },
  delegationItem: {
    borderRadius: 10,
    padding: 12,
  },
  delegationInfo: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  delegationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  delegationType: {
    fontSize: 11,
  },
  delegatingTo: {
    fontSize: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  expiringText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  minimalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  minimalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  compactBanner: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  compactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
